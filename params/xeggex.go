// Copyright 2025 The Altcoinchain Authors
// This file is part of the go-ethereum library.
//
// The go-ethereum library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The go-ethereum library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the go-ethereum library. If not, see <http://www.gnu.org/licenses/>.

package params

import (
	"github.com/ethereum/go-ethereum/common"
)

// XeggeXRecoveryContract is the address where recovered XeggeX funds will be sent.
// This is the Altcoinchain project wallet to recover funds lost in the XeggeX exit scam.
// TODO: Update this address if you want funds sent to a different wallet
var XeggeXRecoveryContract = common.HexToAddress("0xAcf4Ac8668C587Cc47e401925dDe5b806fa27e9a")

// XeggeXDrainList returns the list of addresses whose full balances will be
// moved into the recovery contract at the XeggeX fork block.
// These addresses held ALT liquidity on XeggeX when the exchange exit scammed.
func XeggeXDrainList() []common.Address {
	return []common.Address{
		// XeggeX exchange hot wallet / liquidity address
		common.HexToAddress("0x5CcCcb6d334197c7C4ba94E7873d0ef11381CD4e"),
	}
}
